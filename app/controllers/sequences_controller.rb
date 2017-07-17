class SequencesController < ApplicationController

  def index
    @sequences = Sequence.all
    json_response(@sequences)
  end

  def show
    @sequence = Sequence.find(params[:id])
    json_response(@sequence)
  end

  def create
    @sequence = Sequence.create!(sequence_params)
    json_response(@sequence)
  end

  def update
    @sequence = Sequence.find(params[:id])
    @sequence.update!(sequence_params)
  end

  def destroy
    @sequence = Sequence.find(params[:id])
    @sequence.destroy
  end

  private
  def sequence_params
    params.permit(:title, :data, :width, :speed)
  end

end
